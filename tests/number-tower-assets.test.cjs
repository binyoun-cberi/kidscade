const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'숫자 타워.html'),'utf8');

test('Number Tower browser JavaScript parses',()=>{
  const scripts=[...html.matchAll(/<script(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]).join('\n');
  const result=spawnSync(process.execPath,['--check'],{input:scripts,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Number Tower uses tracked Kenney hero poses and enemy sprites',()=>{
  const required=[
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk1.png',
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-action1.png',
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-hurt.png',
    'assets/game/2d/platformer-art/extended/enemies/slime-green.png',
    'assets/game/2d/platformer-art/extended/enemies/spider.png',
    'assets/game/2d/platformer-art/extended/enemies/ghost.png',
    'assets/game/2d/platformer-art/extended/enemies/snake-lava.png'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(html,/const ASSET=/);
  assert.match(html,/asset-sprite asset-hero/);
  assert.match(html,/monster-\\$\\{m\.id\\}/);
  assert.match(html,/sprite\("enemy",r\.n\)/);
});

test('Number Tower preserves combat and arithmetic progression systems',()=>{
  assert.match(html,/function chooseRoom/);
  assert.match(html,/async function winBattle/);
  assert.match(html,/async function loseBattle/);
  assert.match(html,/function ask\(eq,correct,onCorrect,wrongReason\)/);
  assert.match(html,/power\+=r\.n/);
  assert.match(html,/power=correct/);
});

test('Number Tower catalog cache-bumps the reworked game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_math_number_tower');
  assert.ok(game);
  assert.equal(game.href,'숫자 타워.html?v=2');
});
